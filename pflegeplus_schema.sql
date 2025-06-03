--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-06-04 00:30:41

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 16711)
-- Name: angehoerige; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.angehoerige (
    id integer NOT NULL,
    patient_id integer,
    vorname character varying(100) NOT NULL,
    nachname character varying(100) NOT NULL,
    beziehung character varying(50),
    telefon character varying(20),
    email character varying(100),
    berechtigung_level integer DEFAULT 1,
    benutzername character varying(50),
    geburtsdatum date,
    erstellt_am timestamp without time zone DEFAULT now()
);


ALTER TABLE public.angehoerige OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16710)
-- Name: angehoerige_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.angehoerige_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.angehoerige_id_seq OWNER TO postgres;

--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 229
-- Name: angehoerige_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.angehoerige_id_seq OWNED BY public.angehoerige.id;


--
-- TOC entry 224 (class 1259 OID 16636)
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    mitarbeiter_id integer,
    patient_id integer,
    aufgabe text NOT NULL,
    zeit character varying(5) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16635)
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 223
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- TOC entry 234 (class 1259 OID 16747)
-- Name: benachrichtigungen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.benachrichtigungen (
    id integer NOT NULL,
    patient_id integer,
    mitarbeiter_id integer,
    typ character varying(50),
    titel character varying(200),
    nachricht text,
    prioritaet character varying(20) DEFAULT 'normal'::character varying,
    gelesen boolean DEFAULT false,
    erstellt_am timestamp without time zone DEFAULT now()
);


ALTER TABLE public.benachrichtigungen OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16746)
-- Name: benachrichtigungen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.benachrichtigungen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.benachrichtigungen_id_seq OWNER TO postgres;

--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 233
-- Name: benachrichtigungen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.benachrichtigungen_id_seq OWNED BY public.benachrichtigungen.id;


--
-- TOC entry 226 (class 1259 OID 16669)
-- Name: gesundheitsdaten; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gesundheitsdaten (
    id integer NOT NULL,
    patient_id integer,
    mitarbeiter_id integer,
    blutdruck_systolisch integer,
    blutdruck_diastolisch integer,
    puls integer,
    temperatur numeric(4,2),
    gewicht numeric(5,2),
    blutzucker integer,
    sauerstoffsaettigung integer,
    bemerkungen text,
    ist_kritisch boolean DEFAULT false,
    gemessen_am timestamp without time zone DEFAULT now()
);


ALTER TABLE public.gesundheitsdaten OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16668)
-- Name: gesundheitsdaten_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gesundheitsdaten_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gesundheitsdaten_id_seq OWNER TO postgres;

--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 225
-- Name: gesundheitsdaten_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gesundheitsdaten_id_seq OWNED BY public.gesundheitsdaten.id;


--
-- TOC entry 228 (class 1259 OID 16690)
-- Name: medikamenten_plan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medikamenten_plan (
    id integer NOT NULL,
    patient_id integer,
    medikament_name character varying(200) NOT NULL,
    dosierung character varying(100),
    einnahmezeiten text[],
    start_datum date DEFAULT CURRENT_DATE,
    end_datum date,
    besondere_hinweise text,
    erstellt_von integer,
    erstellt_am timestamp without time zone DEFAULT now()
);


ALTER TABLE public.medikamenten_plan OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16689)
-- Name: medikamenten_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medikamenten_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medikamenten_plan_id_seq OWNER TO postgres;

--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 227
-- Name: medikamenten_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medikamenten_plan_id_seq OWNED BY public.medikamenten_plan.id;


--
-- TOC entry 218 (class 1259 OID 16568)
-- Name: mitarbeiter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mitarbeiter (
    id integer NOT NULL,
    vorname character varying(100),
    nachname character varying(100),
    benutzername character varying(100),
    geburtsdatum date,
    rolle character varying(50) DEFAULT 'pflegekraft'::character varying,
    abteilung character varying(50),
    schicht character varying(20),
    telefon character varying(20),
    email character varying(100),
    qualifikationen text,
    status character varying(20) DEFAULT 'active'::character varying,
    adresse text,
    standort character varying(50)
);


ALTER TABLE public.mitarbeiter OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16567)
-- Name: mitarbeiter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mitarbeiter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mitarbeiter_id_seq OWNER TO postgres;

--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 217
-- Name: mitarbeiter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mitarbeiter_id_seq OWNED BY public.mitarbeiter.id;


--
-- TOC entry 222 (class 1259 OID 16613)
-- Name: patient_zuweisung; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_zuweisung (
    id integer NOT NULL,
    mitarbeiter_id integer,
    patient_id integer,
    zuweisung_datum timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'active'::character varying,
    zuweisungsdatum timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.patient_zuweisung OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16612)
-- Name: patient_zuweisung_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_zuweisung_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_zuweisung_id_seq OWNER TO postgres;

--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 221
-- Name: patient_zuweisung_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_zuweisung_id_seq OWNED BY public.patient_zuweisung.id;


--
-- TOC entry 220 (class 1259 OID 16575)
-- Name: patienten; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patienten (
    id integer NOT NULL,
    vorname character varying(100),
    nachname character varying(100),
    benutzername character varying(100),
    geburtsdatum date,
    adresse text,
    telefon character varying(20),
    notfallkontakt text,
    angehoerige text,
    gesundheitszustand text,
    medikamente text,
    allergien text,
    zimmer_nummer character varying(10),
    standort character varying(50) DEFAULT 'Krefeld'::character varying,
    aufnahmedatum date DEFAULT CURRENT_DATE,
    entlassungsdatum date,
    status character varying(20) DEFAULT 'active'::character varying
);


ALTER TABLE public.patienten OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16574)
-- Name: patienten_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patienten_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patienten_id_seq OWNER TO postgres;

--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 219
-- Name: patienten_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patienten_id_seq OWNED BY public.patienten.id;


--
-- TOC entry 232 (class 1259 OID 16727)
-- Name: standort_verlauf; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.standort_verlauf (
    id integer NOT NULL,
    patient_id integer,
    alter_standort character varying(50),
    neuer_standort character varying(50),
    grund text,
    geaendert_von integer,
    geaendert_am timestamp without time zone DEFAULT now()
);


ALTER TABLE public.standort_verlauf OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16726)
-- Name: standort_verlauf_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.standort_verlauf_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.standort_verlauf_id_seq OWNER TO postgres;

--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 231
-- Name: standort_verlauf_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.standort_verlauf_id_seq OWNED BY public.standort_verlauf.id;


--
-- TOC entry 236 (class 1259 OID 16793)
-- Name: transfer_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfer_requests (
    id integer NOT NULL,
    patient_id integer,
    requester_type character varying(20) NOT NULL,
    requester_id integer,
    requester_name character varying(200) NOT NULL,
    current_standort character varying(50) NOT NULL,
    gewuenschter_standort character varying(50) NOT NULL,
    grund text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_id integer,
    admin_response text,
    erstellt_am timestamp without time zone DEFAULT now(),
    bearbeitet_am timestamp without time zone,
    prioritaet character varying(20) DEFAULT 'normal'::character varying
);


ALTER TABLE public.transfer_requests OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16792)
-- Name: transfer_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transfer_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transfer_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5032 (class 0 OID 0)
-- Dependencies: 235
-- Name: transfer_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transfer_requests_id_seq OWNED BY public.transfer_requests.id;


--
-- TOC entry 4807 (class 2604 OID 16714)
-- Name: angehoerige id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.angehoerige ALTER COLUMN id SET DEFAULT nextval('public.angehoerige_id_seq'::regclass);


--
-- TOC entry 4799 (class 2604 OID 16639)
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- TOC entry 4812 (class 2604 OID 16750)
-- Name: benachrichtigungen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benachrichtigungen ALTER COLUMN id SET DEFAULT nextval('public.benachrichtigungen_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 16672)
-- Name: gesundheitsdaten id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gesundheitsdaten ALTER COLUMN id SET DEFAULT nextval('public.gesundheitsdaten_id_seq'::regclass);


--
-- TOC entry 4804 (class 2604 OID 16693)
-- Name: medikamenten_plan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medikamenten_plan ALTER COLUMN id SET DEFAULT nextval('public.medikamenten_plan_id_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 16571)
-- Name: mitarbeiter id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitarbeiter ALTER COLUMN id SET DEFAULT nextval('public.mitarbeiter_id_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 16616)
-- Name: patient_zuweisung id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_zuweisung ALTER COLUMN id SET DEFAULT nextval('public.patient_zuweisung_id_seq'::regclass);


--
-- TOC entry 4790 (class 2604 OID 16578)
-- Name: patienten id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patienten ALTER COLUMN id SET DEFAULT nextval('public.patienten_id_seq'::regclass);


--
-- TOC entry 4810 (class 2604 OID 16730)
-- Name: standort_verlauf id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.standort_verlauf ALTER COLUMN id SET DEFAULT nextval('public.standort_verlauf_id_seq'::regclass);


--
-- TOC entry 4816 (class 2604 OID 16796)
-- Name: transfer_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_requests ALTER COLUMN id SET DEFAULT nextval('public.transfer_requests_id_seq'::regclass);


--
-- TOC entry 4843 (class 2606 OID 16720)
-- Name: angehoerige angehoerige_benutzername_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.angehoerige
    ADD CONSTRAINT angehoerige_benutzername_key UNIQUE (benutzername);


--
-- TOC entry 4845 (class 2606 OID 16718)
-- Name: angehoerige angehoerige_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.angehoerige
    ADD CONSTRAINT angehoerige_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 16644)
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 16757)
-- Name: benachrichtigungen benachrichtigungen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benachrichtigungen
    ADD CONSTRAINT benachrichtigungen_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 16678)
-- Name: gesundheitsdaten gesundheitsdaten_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gesundheitsdaten
    ADD CONSTRAINT gesundheitsdaten_pkey PRIMARY KEY (id);


--
-- TOC entry 4841 (class 2606 OID 16699)
-- Name: medikamenten_plan medikamenten_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medikamenten_plan
    ADD CONSTRAINT medikamenten_plan_pkey PRIMARY KEY (id);


--
-- TOC entry 4821 (class 2606 OID 16573)
-- Name: mitarbeiter mitarbeiter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitarbeiter
    ADD CONSTRAINT mitarbeiter_pkey PRIMARY KEY (id);


--
-- TOC entry 4830 (class 2606 OID 16622)
-- Name: patient_zuweisung patient_zuweisung_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_zuweisung
    ADD CONSTRAINT patient_zuweisung_patient_id_key UNIQUE (patient_id);


--
-- TOC entry 4832 (class 2606 OID 16620)
-- Name: patient_zuweisung patient_zuweisung_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_zuweisung
    ADD CONSTRAINT patient_zuweisung_pkey PRIMARY KEY (id);


--
-- TOC entry 4823 (class 2606 OID 16580)
-- Name: patienten patienten_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patienten
    ADD CONSTRAINT patienten_pkey PRIMARY KEY (id);


--
-- TOC entry 4849 (class 2606 OID 16735)
-- Name: standort_verlauf standort_verlauf_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.standort_verlauf
    ADD CONSTRAINT standort_verlauf_pkey PRIMARY KEY (id);


--
-- TOC entry 4857 (class 2606 OID 16803)
-- Name: transfer_requests transfer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4846 (class 1259 OID 16771)
-- Name: idx_angehoerige_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_angehoerige_patient ON public.angehoerige USING btree (patient_id);


--
-- TOC entry 4824 (class 1259 OID 16633)
-- Name: idx_assignments_mitarbeiter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_mitarbeiter ON public.patient_zuweisung USING btree (mitarbeiter_id);


--
-- TOC entry 4825 (class 1259 OID 16634)
-- Name: idx_assignments_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_patient ON public.patient_zuweisung USING btree (patient_id);


--
-- TOC entry 4852 (class 1259 OID 16773)
-- Name: idx_benachrichtigungen_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_benachrichtigungen_patient ON public.benachrichtigungen USING btree (patient_id);


--
-- TOC entry 4837 (class 1259 OID 16769)
-- Name: idx_gesundheitsdaten_datum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gesundheitsdaten_datum ON public.gesundheitsdaten USING btree (gemessen_am);


--
-- TOC entry 4838 (class 1259 OID 16768)
-- Name: idx_gesundheitsdaten_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gesundheitsdaten_patient ON public.gesundheitsdaten USING btree (patient_id);


--
-- TOC entry 4839 (class 1259 OID 16770)
-- Name: idx_medikamenten_plan_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medikamenten_plan_patient ON public.medikamenten_plan USING btree (patient_id);


--
-- TOC entry 4826 (class 1259 OID 16789)
-- Name: idx_patient_zuweisung_mitarbeiter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_zuweisung_mitarbeiter ON public.patient_zuweisung USING btree (mitarbeiter_id);


--
-- TOC entry 4827 (class 1259 OID 16790)
-- Name: idx_patient_zuweisung_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_zuweisung_patient ON public.patient_zuweisung USING btree (patient_id);


--
-- TOC entry 4828 (class 1259 OID 16791)
-- Name: idx_patient_zuweisung_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_zuweisung_status ON public.patient_zuweisung USING btree (status);


--
-- TOC entry 4847 (class 1259 OID 16772)
-- Name: idx_standort_verlauf_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_standort_verlauf_patient ON public.standort_verlauf USING btree (patient_id);


--
-- TOC entry 4853 (class 1259 OID 16816)
-- Name: idx_transfer_requests_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_requests_created ON public.transfer_requests USING btree (erstellt_am);


--
-- TOC entry 4854 (class 1259 OID 16814)
-- Name: idx_transfer_requests_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_requests_patient ON public.transfer_requests USING btree (patient_id);


--
-- TOC entry 4855 (class 1259 OID 16815)
-- Name: idx_transfer_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfer_requests_status ON public.transfer_requests USING btree (status);


--
-- TOC entry 4866 (class 2606 OID 16721)
-- Name: angehoerige angehoerige_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.angehoerige
    ADD CONSTRAINT angehoerige_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


--
-- TOC entry 4860 (class 2606 OID 16645)
-- Name: assignments assignments_mitarbeiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4861 (class 2606 OID 16650)
-- Name: assignments assignments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id);


--
-- TOC entry 4869 (class 2606 OID 16763)
-- Name: benachrichtigungen benachrichtigungen_mitarbeiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benachrichtigungen
    ADD CONSTRAINT benachrichtigungen_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4870 (class 2606 OID 16758)
-- Name: benachrichtigungen benachrichtigungen_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benachrichtigungen
    ADD CONSTRAINT benachrichtigungen_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


--
-- TOC entry 4862 (class 2606 OID 16684)
-- Name: gesundheitsdaten gesundheitsdaten_mitarbeiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gesundheitsdaten
    ADD CONSTRAINT gesundheitsdaten_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4863 (class 2606 OID 16679)
-- Name: gesundheitsdaten gesundheitsdaten_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gesundheitsdaten
    ADD CONSTRAINT gesundheitsdaten_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


--
-- TOC entry 4864 (class 2606 OID 16705)
-- Name: medikamenten_plan medikamenten_plan_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medikamenten_plan
    ADD CONSTRAINT medikamenten_plan_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4865 (class 2606 OID 16700)
-- Name: medikamenten_plan medikamenten_plan_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medikamenten_plan
    ADD CONSTRAINT medikamenten_plan_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


--
-- TOC entry 4858 (class 2606 OID 16623)
-- Name: patient_zuweisung patient_zuweisung_mitarbeiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_zuweisung
    ADD CONSTRAINT patient_zuweisung_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4859 (class 2606 OID 16628)
-- Name: patient_zuweisung patient_zuweisung_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_zuweisung
    ADD CONSTRAINT patient_zuweisung_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id);


--
-- TOC entry 4867 (class 2606 OID 16741)
-- Name: standort_verlauf standort_verlauf_geaendert_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.standort_verlauf
    ADD CONSTRAINT standort_verlauf_geaendert_von_fkey FOREIGN KEY (geaendert_von) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4868 (class 2606 OID 16736)
-- Name: standort_verlauf standort_verlauf_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.standort_verlauf
    ADD CONSTRAINT standort_verlauf_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


--
-- TOC entry 4871 (class 2606 OID 16809)
-- Name: transfer_requests transfer_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.mitarbeiter(id);


--
-- TOC entry 4872 (class 2606 OID 16804)
-- Name: transfer_requests transfer_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_requests
    ADD CONSTRAINT transfer_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patienten(id) ON DELETE CASCADE;


-- Completed on 2025-06-04 00:30:41

--
-- PostgreSQL database dump complete
--

